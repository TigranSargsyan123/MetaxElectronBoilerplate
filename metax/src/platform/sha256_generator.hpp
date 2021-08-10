/**
 * @file src/platform/sha256_generator.hpp
 *
 * @brief Defines Metax communication protocol.
 *
 * COPYWRITE_TODO
 *
 */

#ifndef LEVIATHAN_PLATFORM_SHA256_GENERATOR_HPP
#define LEVIATHAN_PLATFORM_SHA256_GENERATOR_HPP


#include <string>
#include <array>

// Forward declarations
namespace leviathan {
	namespace platform {
		class sha256_generator;
	}
}

class leviathan::platform::sha256_generator {

public:
	sha256_generator();
	void update(const uint8_t * data, size_t length);
	void update(const std::string &data);
	uint8_t * digest();

	static std::string toString(const uint8_t * digest);

private:
	uint8_t  m_data[64];
	uint32_t m_blocklen;
	uint64_t m_bitlen;
	uint32_t m_state[8]; //A, B, C, D, E, F, G, H

	static uint32_t rotr(uint32_t x, uint32_t n);
	static uint32_t choose(uint32_t e, uint32_t f, uint32_t g);
	static uint32_t majority(uint32_t a, uint32_t b, uint32_t c);
	static uint32_t sig0(uint32_t x);
	static uint32_t sig1(uint32_t x);
	void transform();
	void pad();
	void revert(uint8_t * hash);
};

#endif
